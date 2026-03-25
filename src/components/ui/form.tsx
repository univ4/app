import * as React from "react";

import { cn } from "@/lib/utils";

type FormProps = React.FormHTMLAttributes<HTMLFormElement>;

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, ...props }, ref) => {
    return <form ref={ref} className={cn("space-y-4", className)} {...props} />;
  },
);
Form.displayName = "Form";

export { Form };
